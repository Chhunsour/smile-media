import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import type { MediaAsset as Media } from '@/models';

const toMedia = (a: ImagePicker.ImagePickerAsset): Media => ({
  id: a.assetId ?? a.uri,
  uri: a.uri,
  type: a.type === 'video' ? 'video' : 'image',
  duration: a.duration ? a.duration / 1000 : undefined,
});

/** System photo picker or camera. Resolves to [] when cancelled, denied or unavailable. */
export async function pickMedia(source: 'library' | 'camera', limit: number): Promise<Media[]> {
  if (limit <= 0) return [];
  try {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera access needed', 'Allow camera access in Settings to capture photos for your posts.');
        return [];
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images', 'videos'], quality: 0.9 };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({
            ...options,
            allowsMultipleSelection: true,
            selectionLimit: limit,
            orderedSelection: true,
          });
    return res.canceled ? [] : res.assets.slice(0, limit).map(toMedia);
  } catch {
    Alert.alert('Camera unavailable', 'This device can’t open the camera right now. Try the photo library instead.');
    return [];
  }
}
