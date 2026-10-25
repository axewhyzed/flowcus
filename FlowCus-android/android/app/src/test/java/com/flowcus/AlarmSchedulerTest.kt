package com.flowcus

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class AlarmSchedulerTest {
    private lateinit var originalTimeZone: TimeZone

    @Before
    fun useUtcForDeterministicCalendarAssertions() {
        originalTimeZone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
    }

    @After
    fun restoreDefaultTimeZone() {
        TimeZone.setDefault(originalTimeZone)
    }

    @Test
    fun calculatesReminderOnTheUpcomingLocalWeekday() {
        val now = calendar(2026, Calendar.OCTOBER, 26, 8, 0).timeInMillis // Monday
        val alarm = TimetableAlarm(1, "Study", "Starts soon", 1, "09:00:00", 5)
        val expected = calendar(2026, Calendar.OCTOBER, 26, 8, 55).timeInMillis

        assertEquals(expected, AlarmScheduler.nextTriggerTime(alarm, now) ?: -1L)
    }

    @Test
    fun movesAnElapsedReminderToTheFollowingWeek() {
        val now = calendar(2026, Calendar.OCTOBER, 26, 9, 1).timeInMillis
        val alarm = TimetableAlarm(1, "Study", "Starts soon", 1, "09:00", 5)
        val expected = calendar(2026, Calendar.NOVEMBER, 2, 8, 55).timeInMillis

        assertEquals(expected, AlarmScheduler.nextTriggerTime(alarm, now) ?: -1L)
    }

    @Test
    fun schedulesOneOffReminderOnItsSpecificLocalDate() {
        val now = calendar(2026, Calendar.OCTOBER, 26, 8, 0).timeInMillis
        val alarm = TimetableAlarm(7, "Appointment", "Starts soon", 0, "09:00:00", 5, "2026-10-27")
        val expected = calendar(2026, Calendar.OCTOBER, 27, 8, 55).timeInMillis

        assertEquals(expected, AlarmScheduler.nextTriggerTime(alarm, now) ?: -1L)
    }

    @Test
    fun expiredOneOffReminderHasNoUpcomingTriggerInsteadOfRepeatingNextWeek() {
        val now = calendar(2026, Calendar.OCTOBER, 27, 9, 1).timeInMillis
        val alarm = TimetableAlarm(8, "Appointment", "Starts soon", 2, "09:00", 5, "2026-10-27")

        assertEquals(null, AlarmScheduler.nextTriggerTime(alarm, now))
        assertEquals(false, AlarmScheduler.shouldScheduleOneOff(alarm, now, emptySet()))
    }

    @Test
    fun consumedOneOffDoesNotBecomeUpcomingAfterClockMovesBack() {
        val now = calendar(2026, Calendar.OCTOBER, 27, 8, 0).timeInMillis
        val alarm = TimetableAlarm(9, "Appointment", "Starts soon", 2, "09:00", 5, "2026-10-27")

        assertEquals(false, AlarmScheduler.shouldScheduleOneOff(alarm, now, setOf(alarm.oneOffKey())))
    }

    @Test
    fun legacyDateLessAlarmRemainsWeekly() {
        // Older persisted JSON has no specificDate field; JSONObject.optString
        // supplies the empty default and the decoder keeps that as weekly.
        assertEquals(null, normalizeAlarmSpecificDate(""))
        assertEquals(null, normalizeAlarmSpecificDate(null))

        val alarm = TimetableAlarm(10, "Legacy", "Starts", 1, "09:00", 5)
        val now = calendar(2026, Calendar.OCTOBER, 26, 8, 0).timeInMillis
        val expected = calendar(2026, Calendar.OCTOBER, 26, 8, 55).timeInMillis

        assertEquals(null, alarm.specificDate)
        assertEquals(expected, AlarmScheduler.nextTriggerTime(alarm, now) ?: -1L)
    }

    @Test
    fun normalizesPersistedDateTimeToItsLocalCalendarDate() {
        assertEquals("2026-10-27", normalizeAlarmSpecificDate("2026-10-27T00:00:00Z"))
    }

    private fun calendar(year: Int, month: Int, day: Int, hour: Int, minute: Int): Calendar =
        Calendar.getInstance().apply {
            set(year, month, day, hour, minute, 0)
            set(Calendar.MILLISECOND, 0)
        }
}
