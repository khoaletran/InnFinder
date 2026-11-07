import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useCreateRoomStore } from '../../../store/useCreateRoomStore';

export default function CreateRoomImagesScreen() {
  const router = useRouter();
  const { setStep } = useCreateRoomStore();

  useEffect(() => {
    setStep(3);
    router.replace('/(landlord)/create-room');
  }, []);

  return null;
}
