export function getLineFromStack(stack?: string): string | undefined {
  if (!stack) return;

  const lines = stack.split("\n");

  // Usually, the second line in the stack is where the error occurred
  const lineWithLocation = lines[1]; // skip "Error: message"

  // Extract file path and line number info
  const match =
    lineWithLocation.match(/\((.*):(\d+):(\d+)\)/) ||
    lineWithLocation.match(/at (.*):(\d+):(\d+)/);
  if (match) {
    const [, file, line, col] = match;
    return `File: ${file}, Line: ${line}, Column: ${col}`;
  }

  return "Could not parse stack trace";
}
