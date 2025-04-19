// src/components/StatsCard.tsx
import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';
import FcCard from './../components/design/FcCard';

type Trend = 'up' | 'down' | 'neutral';

interface Props {
  title: string;
  value: string;
  delta?: string;
  icon?: string;
  trend?: Trend;
}

const trendMap: Record<Trend, { icon: string; color: string }> = {
  up:      { icon: 'arrow-up',   color: '#10B981' },
  down:    { icon: 'arrow-down', color: '#EF4444' },
  neutral: { icon: 'minus',      color: '#F59E0B' },
};

const StatsCard: React.FC<Props> = ({ title, value, delta, icon, trend }) => {
  const { colors } = useTheme();

  // Guard against undefined trend before indexing
  const { icon: trendIcon, color: trendColor } = 
    trend 
      ? trendMap[trend] 
      : { icon: '', color: colors.text };

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

      {(delta || trend) && (
        <Text style={tw`flex-row items-center text-xs font-medium mt-2`}>
          {trendIcon.length > 0 && (
            <Icon name={trendIcon} size={14} color={trendColor} />
          )}
          <Text style={{ color: delta ? colors.primary : trendColor, marginLeft: trendIcon ? 4 : 0 }}>
            {delta ?? (trend === 'up' ? '+5.4%' : trend === 'down' ? '-2.1%' : '0%')}
          </Text>
        </Text>
      )}
    </FcCard>
  );
};

export default StatsCard;
