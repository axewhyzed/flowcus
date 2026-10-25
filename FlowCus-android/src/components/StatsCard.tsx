// src/components/StatsCard.tsx
import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import FcCard from './../components/design/FcCard';

interface Props {
  title: string;
  value: string;
  delta?: string;
  icon?: string;
}

const StatsCard: React.FC<Props> = ({ title, value, delta, icon }) => {
  const { colors } = useTheme();

  return (
    <FcCard
      showDivider={false}
      containerStyle={tw`mx-2 min-w-[120px] max-w-[140px] items-center`}
    >
      {icon && (
        <Icon
          name={icon}
          size={20}
          color={colors.primary}
          style={tw`mb-1`}
        />
      )}

      <Text style={[tw`text-2xl font-bold`, { color: colors.text }]}>
        {value}
      </Text>

      <Text style={[tw`text-sm mt-1`, { color: colors.text, opacity: 0.7 }]}>
        {title}
      </Text>

      {delta && (
        <Text style={[tw`text-xs font-medium mt-2`, { color: colors.primary }]}>
          {delta}
        </Text>
      )}
    </FcCard>
  );
};

export default StatsCard;
