import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw from 'twrnc';

interface StatsCardProps {
    title: string;
    value: string;
    delta?: string;
    icon?: string;
    trend?: 'up' | 'down' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
    title, 
    value, 
    delta, 
    icon, 
    trend 
}) => {
    const { colors } = useTheme();

    const getTrendColor = () => {
        switch (trend) {
            case 'up': return '#10B981'; // Emerald-500
            case 'down': return '#EF4444'; // Red-500
            case 'neutral': return '#F59E0B'; // Amber-500
            default: return colors.text;
        }
    };

    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return 'arrow-up';
            case 'down': return 'arrow-down';
            case 'neutral': return 'minus';
            default: return '';
        }
    };

    return (
        <View style={[
            tw`p-4 rounded-xl mx-2 min-w-[120px] max-w-[140px] items-center justify-center`,
            { 
                backgroundColor: colors.card,
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3
            }
        ]}>
            {/* Icon and Value Row */}
            <View style={tw`flex-row items-center`}>
                {icon && (
                    <Icon 
                        name={icon} 
                        size={20} 
                        color={colors.primary} 
                        style={tw`mr-2`}
                    />
                )}
                <Text style={[
                    tw`text-2xl font-bold`,
                    { color: colors.text }
                ]}>
                    {value}
                </Text>
            </View>
            
            {/* Title */}
            <Text style={[
                tw`text-sm mt-1`,
                { color: colors.text, opacity: 0.7 }
            ]}>
                {title}
            </Text>
            
            {/* Delta with Trend Indicator */}
            {(delta || trend) && (
                <View style={tw`flex-row items-center mt-2`}>
                    {trend && (
                        <Icon 
                            name={getTrendIcon()} 
                            size={14} 
                            color={getTrendColor()} 
                            style={tw`mr-1`}
                        />
                    )}
                    <Text style={[
                        tw`text-xs font-medium`,
                        { color: delta ? colors.primary : getTrendColor() }
                    ]}>
                        {delta || (trend === 'up' ? '+5.2%' : trend === 'down' ? '-2.1%' : '0%')}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default StatsCard;