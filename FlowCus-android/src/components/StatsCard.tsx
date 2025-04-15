import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from "../config/colors";

interface StatsCardProps {
    title: string;
    value: string;
    delta?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, delta }) => {
    return (
        <View style={styles.card}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.title}>{title}</Text>
            {delta ? <Text style={styles.delta}>{delta}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        elevation: 4,
        // Add these new properties:
        flex: 1,              // Makes cards expand equally
        marginHorizontal: 8,   // Horizontal margin only
        minWidth: 100,        // Minimum width
        maxWidth: 120,        // Maximum width (adjust as needed)
        alignItems: 'center', // Center content horizontally
    },
    value: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 20,
        textAlign: 'center',  // Center the text
    },
    title: {
        color: colors.text,
        marginVertical: 4,
        opacity: 0.7,
        textAlign: 'center',  // Center the text
    },
    delta: {
        color: colors.secondary,
        marginTop: 4,
        textAlign: 'center',  // Center the text
    },
});

export default StatsCard;
