namespace FlowCus.Helpers
{
    public sealed class IdempotencyConflictException : Exception
    {
        public IdempotencyConflictException(string message) : base(message) { }
    }
}
