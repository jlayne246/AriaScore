import { useAppTheme } from "../utils/theme/useAppTheme";
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface DeleteModalProps {
  itemId: number;
  onCancel: () => void;
  onDelete: (itemId: number) => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ itemId, onCancel, onDelete }) => {
  const { colors } = useAppTheme();
  return (
    <View className="absolute top-0 left-0 right-0 bottom-0 z-50 justify-center items-center" style={{ backgroundColor: colors.overlay }}>
      <View className="p-6 rounded-lg shadow-md w-[95%] max-w-[320px]" style={{ backgroundColor: colors.elevated }}>
        <Text className="text-base mb-4 text-center" style={{ color: colors.text }}>
          Are you sure you want to delete?
        </Text>

        <View className="flex-row justify-end space-x-3">
          <TouchableOpacity
            className="py-3 px-5 rounded" style={{ backgroundColor: colors.surfaceSecondary }}
            onPress={onCancel}
          >
            <Text className="text-s font-semibold" style={{ color: colors.text }}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-3 px-5 rounded" style={{ backgroundColor: colors.danger }}
            onPress={() => onDelete(itemId)}
          >
            <Text className="text-s font-semibold" style={{ color: colors.onDanger }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};


export default DeleteModal;
