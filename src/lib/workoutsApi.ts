import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LOG_LOOKBACK_DAYS } from '../constants/challenge';
import { EXERCISE_TYPES } from '../types';
import { getAllowedLogDates, getWeekStart, isWeekClosed, todayDateOnly } from './dates';
import { supabase } from './supabase';

export async function pickWorkoutPhoto(
  source: 'camera' | 'library',
): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Se necesita permiso de cámara.'
        : 'Se necesita permiso de galería.',
    );
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: true,
          aspect: [4, 3],
          exif: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: true,
          aspect: [4, 3],
          exif: false,
        });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

function guessExtAndType(localUri: string): { ext: string; contentType: string } {
  const raw = localUri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
  if (raw === 'png') return { ext: 'png', contentType: 'image/png' };
  if (raw === 'webp') return { ext: 'webp', contentType: 'image/webp' };
  if (raw === 'gif') return { ext: 'gif', contentType: 'image/gif' };
  // iPhone HEIC/unknown → upload as jpeg (picker quality usually yields jpeg bytes)
  return { ext: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Mobile-safe upload: RN blobs from fetch(file://) are often empty/broken.
 * Read base64 via expo-file-system and upload ArrayBuffer to Supabase Storage.
 */
async function uploadPhoto(userId: string, localUri: string): Promise<string> {
  const { ext, contentType } = guessExtAndType(localUri);
  const path = `${userId}/${Date.now()}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64 || base64.length < 32) {
    throw new Error('No se pudo leer la foto del dispositivo.');
  }

  const { error } = await supabase.storage
    .from('workout-photos')
    .upload(path, decode(base64), {
      contentType,
      upsert: false,
    });

  if (error) throw new Error(`Error al subir foto: ${error.message}`);
  const { data } = supabase.storage.from('workout-photos').getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('No se obtuvo URL pública de la foto.');
  }
  return data.publicUrl;
}

export function exerciseTypeLabel(value: string): string {
  return EXERCISE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export interface LogWorkoutInput {
  userId: string;
  groupId: string | null;
  exerciseType: string;
  workoutDate: string;
  localPhotoUri: string;
  displayName: string;
}

export function assertLogDateAllowed(workoutDate: string, today = todayDateOnly()) {
  const { isAllowed } = getAllowedLogDates(today, LOG_LOOKBACK_DAYS);
  if (!isAllowed(workoutDate)) {
    if (isWeekClosed(getWeekStart(workoutDate), today)) {
      throw new Error('Esa semana ya cerró — los registros están bloqueados.');
    }
    throw new Error(
      `Elige hoy o hasta ${LOG_LOOKBACK_DAYS} días atrás (solo semanas abiertas).`,
    );
  }
}

export async function logWorkout(input: LogWorkoutInput): Promise<string> {
  assertLogDateAllowed(input.workoutDate);
  const photoUrl = await uploadPhoto(input.userId, input.localPhotoUri);
  const typeLabel = exerciseTypeLabel(input.exerciseType);

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: input.userId,
      workout_date: input.workoutDate,
      exercise_type: input.exerciseType,
      photo_url: photoUrl,
      media_type: 'photo',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  if (input.groupId) {
    const { error: activityError } = await supabase.from('activity_events').insert({
      group_id: input.groupId,
      user_id: input.userId,
      event_type: 'workout',
      title: `${input.displayName} registró ${typeLabel}`,
      body: `Evidencia del ${input.workoutDate}`,
      workout_id: data.id,
    });
    if (activityError) {
      throw new Error(`Entrenamiento guardado, pero falló el feed: ${activityError.message}`);
    }

    // Unified chat stream — workout appears as a message with photo
    const { error: chatError } = await supabase.from('chat_messages').insert({
      group_id: input.groupId,
      user_id: input.userId,
      body: `${input.displayName} · ${typeLabel} · ${input.workoutDate}`,
      media_url: photoUrl,
      media_type: 'image',
      link_url: null,
      workout_id: data.id,
    });
    if (chatError) {
      throw new Error(
        `Entrenamiento guardado, pero no apareció en el chat: ${chatError.message}`,
      );
    }
  }

  return data.id as string;
}

export async function addWorkoutComment(
  workoutId: string,
  userId: string,
  body: string,
) {
  const { error } = await supabase.from('workout_comments').insert({
    workout_id: workoutId,
    user_id: userId,
    body: body.trim(),
  });
  if (error) throw new Error(error.message);
}
