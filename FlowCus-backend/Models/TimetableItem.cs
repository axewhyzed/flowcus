public class TimetableItem
{
    public int Id { get; set; }
    public int TimetableId { get; set; }
    public int TaskTemplateId { get; set; }
    public int DayOfWeek { get; set; } // 0 = Sunday … 6 = Saturday
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public bool IsDeleted { get; set; }

    public Timetable Timetable { get; set; }
    public TaskTemplate TaskTemplate { get; set; }
}
