using System.Text.Json.Serialization;

namespace FlowCus.Models
{
    /// <summary>
    /// Partial task update. A property that is omitted is unchanged; an explicitly
    /// supplied null clears nullable task fields.
    /// </summary>
    public sealed class TaskPatchRequest
    {
        private string? _title;
        private string? _description;
        private int? _priority;
        private int? _taskCategoryId;
        private int? _taskSubtypeId;
        private DateTime? _startTime;
        private DateTime? _endTime;
        private bool? _isCompleted;

        public string? Title { get => _title; set { _title = value; HasTitle = true; } }
        public string? Description { get => _description; set { _description = value; HasDescription = true; } }
        public int? Priority { get => _priority; set { _priority = value; HasPriority = true; } }
        public int? TaskCategoryId { get => _taskCategoryId; set { _taskCategoryId = value; HasTaskCategoryId = true; } }
        public int? TaskSubtypeId { get => _taskSubtypeId; set { _taskSubtypeId = value; HasTaskSubtypeId = true; } }
        public DateTime? StartTime { get => _startTime; set { _startTime = value; HasStartTime = true; } }
        public DateTime? EndTime { get => _endTime; set { _endTime = value; HasEndTime = true; } }
        public bool? IsCompleted { get => _isCompleted; set { _isCompleted = value; HasIsCompleted = true; } }

        [JsonIgnore] public bool HasTitle { get; private set; }
        [JsonIgnore] public bool HasDescription { get; private set; }
        [JsonIgnore] public bool HasPriority { get; private set; }
        [JsonIgnore] public bool HasTaskCategoryId { get; private set; }
        [JsonIgnore] public bool HasTaskSubtypeId { get; private set; }
        [JsonIgnore] public bool HasStartTime { get; private set; }
        [JsonIgnore] public bool HasEndTime { get; private set; }
        [JsonIgnore] public bool HasIsCompleted { get; private set; }
    }
}
