// src/components/CustomCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, GestureResponderEvent } from 'react-native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialIcons';

type FcCardProps = {
  title?: string;
  subtitle?: string;
  icon?: string;
  children?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  containerStyle?: ViewStyle;
  showDivider?: boolean;
};

const FcCard: React.FC<FcCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  onPress,
  containerStyle,
  showDivider = true,
}) => {
  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={onPress}
      style={[
        tw`bg-white p-4 rounded-2xl shadow-md mb-4`,
        {
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        containerStyle,
      ]}
    >
      {(title || subtitle || icon) && (
        <View style={tw`flex-row items-center mb-2`}>
          {icon && <Icon name={icon} size={24} style={tw`mr-3 text-gray-600`} />}
          <View>
            {title && <Text style={tw`text-base font-semibold text-gray-900`}>{title}</Text>}
            {subtitle && <Text style={tw`text-sm text-gray-500`}>{subtitle}</Text>}
          </View>
        </View>
      )}

      {showDivider && (title || subtitle || icon) && <View style={tw`h-px bg-gray-200 my-2`} />}

      <View>{children}</View>
    </CardWrapper>
  );
};

export default FcCard;