using FlowCus.Models;

public class TaskEntity
{
    public int TaskId { get; set; }
    public int TaskTemplateId { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public int? Priority { get; set; }
    public DateTime CreatedOn { get; set; }
    public int CreatedBy { get; set; }
    public DateTime? UpdatedOn { get; set; }
    public int? UpdatedBy { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationSeconds { get; set; }
    public bool IsDeleted { get; set; }

    public TaskTemplate TaskTemplate { get; set; }
    public User User { get; set; }
}
