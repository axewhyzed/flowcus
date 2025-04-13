import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import colors from "../config/colors";
import { Surface, Text } from 'react-native-paper';

interface StatsCardProps {
    title: string;
    value: string;
    delta?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, delta }) => {
    return (
        <Surface style={styles.card}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.title}>{title}</Text>
            {delta && <Text style={styles.delta}>{delta}</Text>}
        </Surface>
    );
};

const styles = StyleSheet.create({
    card: {
        margin: 8,
        width: 'auto',
        maxWidth: 160,
        elevation: 4, // Built-in shadow effect
        borderRadius: 12,
        backgroundColor: 'white',
        padding: 12,
    },
    value: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 20,
    },
    title: {
        color: colors.text,
        marginVertical: 4,
        opacity: 0.7,
    },
    delta: {
        color: colors.secondary,
        marginTop: 4,
    }
});

export default StatsCard;