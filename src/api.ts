import { Forklift } from "./types";

const API_BASE = "http://localhost:5232/api";

export async function getForklifts(): Promise<Forklift[]> {
  const response = await fetch(`${API_BASE}/forklifts`);
  if (!response.ok) {
    throw new Error("Failed to fetch forklifts");
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse response as JSON');
  }
}

export async function parseCommands(commandString: string) {
  const response = await fetch(`${API_BASE}/commands/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ commandString }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to parse commands');
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse response as JSON');
  }
}

export async function saveCommand(command: string, forkliftId: number) {
  const response = await fetch(`${API_BASE}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command, forkliftId }),
  });

  if (!response.ok) {
    throw new Error('Failed to save command');
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('Failed to parse response as JSON');
  }
}