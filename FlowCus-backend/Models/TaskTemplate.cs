using FlowCus.Models;

public class TaskTemplate
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedOn { get; set; }

    public User User { get; set; }
    public ICollection<TaskEntity> TaskEntities { get; set; }  // actual scheduled/recorded tasks
    public ICollection<TimetableItem> TimetableItems { get; set; }
}
