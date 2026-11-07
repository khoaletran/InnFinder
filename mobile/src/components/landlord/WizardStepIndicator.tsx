import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  currentStep: number;
  onSelectStep?: (step: number) => void;
}

const STEPS = [
  { id: 1, label: 'Cơ bản' },
  { id: 2, label: 'Tiện ích' },
  { id: 3, label: 'Hình ảnh' },
];

export const WizardStepIndicator: React.FC<Props> = ({ currentStep, onSelectStep }) => {
  return (
    <View className="py-3 px-8 bg-white border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <Pressable
                onPress={() => onSelectStep && onSelectStep(step.id)}
                className="items-center"
              >
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    isCompleted
                      ? 'bg-teal-700'
                      : isActive
                      ? 'bg-teal-700 ring-4 ring-teal-100'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
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
                  className={`text-xs mt-1.5 font-medium ${
                    isActive
                      ? 'text-teal-700 font-bold'
                      : isCompleted
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </Text>
              </Pressable>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <View
                  className={`flex-1 h-[2px] mx-3 mb-5 ${
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
