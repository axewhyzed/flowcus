using FlowCus.Models;

public class Timetable
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; }
    public ICollection<TimetableItem> TimetableItems { get; set; }
}
