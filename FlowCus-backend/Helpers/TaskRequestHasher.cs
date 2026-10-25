using FlowCus.Models;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FlowCus.Helpers
{
    public static class TaskRequestHasher
    {
        public static string Hash(TaskEntity task)
        {
            var canonicalPayload = new
            {
                task.TaskCategoryId,
                task.TaskSubtypeId,
                task.Title,
                task.Description,
                task.Priority,
                task.StartTime,
                task.EndTime,
                task.IsCompleted
            };
            return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(canonicalPayload))));
        }
    }
}
