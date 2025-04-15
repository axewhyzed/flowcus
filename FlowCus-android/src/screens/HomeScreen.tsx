import React from 'react';
import { StyleSheet, View, ScrollView, Button, Text, TouchableOpacity, ToastAndroid, Alert } from 'react-native';
import colors from "../config/colors";
import StatsCard from "../components/StatsCard";

const HomeScreen = ({ navigation }: any) => {
    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        Good Morning, Mihir!
                    </Text>
                    <Text style={styles.date}>
                        Thursday, May 16
                    </Text>
                </View>

                {/* Stats Cards */}
                <ScrollView contentContainerStyle={styles.statsRow}>
                    <StatsCard title="Daily Avg" value="4.2h" />
                    <StatsCard title="Completion" value="78%" />
                    <StatsCard title="Sessions" value="22" />
                </ScrollView>

                {/* Chart */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>
                        Weekly Progress
                    </Text>
                </View>

                {/* Navigation Buttons */}
                <Text style={styles.header}>🏠 Home Screen</Text>
                <Button title="Go to About" onPress={() => navigation.navigate('About')} />
                <Button title="Go to Contact" onPress={() => navigation.navigate('Contact')} />
            </ScrollView>

            {/* Floating Action Button */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => Alert.alert('Plus Pressed!')}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => ToastAndroid.show('Minus Pressed!', ToastAndroid.SHORT)}
                >
                    <Text style={styles.fabText}>-</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

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
        fontSize: 24,
    },
    date: {
        color: colors.text,
        opacity: 0.7,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center', // Centers horizontally
        alignItems: 'center',    // Centers vertically
        paddingHorizontal: 16,   // Equal padding on both sides
        marginVertical: 8,
        gap: 16,                 // Equal spacing between cards
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
        backgroundColor: colors.secondary,
        borderRadius: 28,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabText: {
        color: '#fff',
        fontSize: 24,
    },
    fabContainer: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        flexDirection: 'row',
        gap: 16, // Space between buttons
    },
});

export default HomeScreen;