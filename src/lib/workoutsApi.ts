import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { todayDateOnly } from './dates';
import { LOG_LOOKBACK_DAYS } from '../constants/challenge';
import { getAllowedLogDates, getWeekStart, isWeekClosed } from './dates';

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
        ? 'Camera permission is required.'
        : 'Photo library permission is required.',
    );
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: true,
          aspect: [4, 3],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
          allowsEditing: true,
          aspect: [4, 3],
        });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

async function uploadPhoto(userId: string, localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('workout-photos')
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('workout-photos').getPublicUrl(path);
  return data.publicUrl;
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
      throw new Error('That week is already closed — records are locked.');
    }
    throw new Error(
      `Pick today or up to ${LOG_LOOKBACK_DAYS} days back (still-open weeks only).`,
    );
  }
}

export async function logWorkout(input: LogWorkoutInput): Promise<string> {
  assertLogDateAllowed(input.workoutDate);
  const photoUrl = await uploadPhoto(input.userId, input.localPhotoUri);

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
    await supabase.from('activity_events').insert({
      group_id: input.groupId,
      user_id: input.userId,
      event_type: 'workout',
      title: `${input.displayName} logged ${input.exerciseType}`,
      body: `Evidence from ${input.workoutDate}`,
      workout_id: data.id,
    });
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
