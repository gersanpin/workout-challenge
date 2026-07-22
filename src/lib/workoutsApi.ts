import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { todayDateOnly } from './dates';

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
        ? 'Camera permission is required to log a workout.'
        : 'Photo library permission is required to log a workout.',
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

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }
  return result.assets[0].uri;
}

async function uploadPhoto(userId: string, localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('workout-photos')
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from('workout-photos').getPublicUrl(path);
  return data.publicUrl;
}

export interface LogWorkoutInput {
  userId: string;
  exerciseType: string;
  durationMinutes: number;
  workoutDate?: string;
  localPhotoUri: string;
}

export async function logWorkout(input: LogWorkoutInput): Promise<void> {
  const photoUrl = await uploadPhoto(input.userId, input.localPhotoUri);

  const { error } = await supabase.from('workouts').insert({
    user_id: input.userId,
    workout_date: input.workoutDate ?? todayDateOnly(),
    exercise_type: input.exerciseType,
    duration_minutes: input.durationMinutes,
    photo_url: photoUrl,
  });

  if (error) {
    throw new Error(error.message);
  }
}
