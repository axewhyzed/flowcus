import React from 'react';
import { StyleSheet, View, ScrollView } from "react-native";
import { Text, FAB } from "react-native-paper";
import colors from "../config/colors";
import StatsCard from "../components/StatsCard";

const HomeScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.greeting}>
                        Good Morning, Mihir!
                    </Text>
                    <Text variant="bodyMedium" style={styles.date}>
                        Thursday, May 16
                    </Text>
                </View>

                {/* Stats Cards */}
                <ScrollView horizontal contentContainerStyle={styles.statsRow}>
                    <StatsCard title="Daily Avg" value="4.2h" />
                    <StatsCard title="Completion" value="78%" />
                    <StatsCard title="Sessions" value="22" />
                </ScrollView>

                {/* Chart */}
                <View style={styles.chartContainer}>
                    <Text variant="titleMedium" style={styles.chartTitle}>
                        Weekly Progress
                    </Text>
                </View>
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => console.log('Add pressed')}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 16,
    },
    header: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    greeting: {
        color: colors.text,
        fontWeight: '600',
    },
    date: {
        color: colors.text,
        opacity: 0.7,
        marginTop: 4,
    },
    statsRow: {
        paddingLeft: 16,
        marginVertical: 8,
    },
    chartContainer: {
        backgroundColor: colors.surface,
        margin: 16,
        borderRadius: 12,
        padding: 16,
    },
    chartTitle: {
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 12,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: colors.secondary,
        borderRadius: 28,
    }
});

export default HomeScreen;