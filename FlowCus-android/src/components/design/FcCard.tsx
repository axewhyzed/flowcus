// src/components/CustomCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, GestureResponderEvent } from 'react-native';
import tw from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@react-navigation/native';

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
  const { colors } = useTheme();
  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={onPress}
      style={[
        tw`p-4 rounded-2xl shadow-md mb-4`,
        { backgroundColor: colors.card },
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
          {icon && <Icon name={icon} size={24} color={colors.text} style={tw`mr-3`} />}
          <View>
            {title && <Text style={[tw`text-base font-semibold`, { color: colors.text }]}>{title}</Text>}
            {subtitle && <Text style={[tw`text-sm`, { color: colors.text, opacity: 0.72 }]}>{subtitle}</Text>}
          </View>
        </View>
      )}

      {showDivider && (title || subtitle || icon) && <View style={[tw`h-px my-2`, { backgroundColor: colors.border }]} />}

      <View>{children}</View>
    </CardWrapper>
  );
};

export default FcCard;
