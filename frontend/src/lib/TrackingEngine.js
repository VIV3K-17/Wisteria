export const isCheckpointOverdue = (checkpoint, now = Date.now()) => {
  if (!checkpoint || checkpoint.reached || !checkpoint.deadline) return false;
  return now > checkpoint.deadline;
};

export const shouldEscalateToLevelThree = ({
  escalationLevel,
  currentCheckpointIndex,
  level2CheckpointIndex,
  checkpoint,
  now = Date.now()
}) => {
  if (escalationLevel !== 2) return false;
  if (level2CheckpointIndex === null || level2CheckpointIndex === undefined) return false;
  if (currentCheckpointIndex <= level2CheckpointIndex) return false;
  return isCheckpointOverdue(checkpoint, now);
};
