import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  currentStep: number;
}

const STEPS = [
  { id: 1, label: 'Cơ bản' },
  { id: 2, label: 'Vị trí' },
  { id: 3, label: 'Tiện ích' },
  { id: 4, label: 'Mô tả' },
  { id: 5, label: 'Hình ảnh' },
];

export const WizardStepIndicator: React.FC<Props> = ({ currentStep }) => {
  return (
    <View className="py-3 px-4 bg-white border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <View className="items-center">
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${
                    isCompleted
                      ? 'bg-teal-700'
                      : isActive
                      ? 'bg-teal-700 ring-2 ring-teal-200'
                      : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  ) : (
                    <Text
                      className={`text-xs font-bold ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  className={`text-[11px] mt-1 font-medium ${
                    isActive ? 'text-teal-700 font-bold' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </Text>
              </View>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <View
                  className={`flex-1 h-[2px] mx-1 mb-4 ${
                    step.id < currentStep ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};
