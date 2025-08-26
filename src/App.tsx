import React, { useEffect, useState } from "react";
import { getForklifts } from "./api";
import { Forklift } from "./types";

// This interface defines the structure of a parsed command
interface Command {
  action: string;     // The command letter (F, B, L, R)
  value: number;      // The numeric value following the letter
  description: string; // Human-readable description for display
}

function App() {
  // Exercise 1: Forklift fleet state
  const [forklifts, setForklifts] = useState<Forklift[]>([]);
  const [selectedForkliftId, setSelectedForkliftId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Exercise 2: Command parsing state
  const [commandInput, setCommandInput] = useState("");           // Raw user input
  const [parsedCommands, setParsedCommands] = useState<Command[]>([]); // Parsed command objects
  const [commandError, setCommandError] = useState<string | null>(null); // Parsing errors

  useEffect(() => {
    getForklifts()
      .then((data: Forklift[]) => {
        setForklifts(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Move regex outside function for performance
  const COMMAND_REGEX = /([FBLR])(\d+)/g;

  // EXERCISE 2: Core command parsing function
  // This function takes a string like "F10R90L90B5" and converts it to structured commands
  const parseCommands = (input: string): Command[] => {
    const commands: Command[] = [];
    
    // Reset regex lastIndex to ensure consistent parsing
    COMMAND_REGEX.lastIndex = 0;
    let match;
    
    // Loop through all matches found by the regex
    // Example: "F10R90" would match twice: ["F", "10"] and ["R", "90"]
    while ((match = COMMAND_REGEX.exec(input)) !== null) {
      const [, action, valueStr] = match; // Destructure: skip full match, get action and value
      const value = parseInt(valueStr);   // Convert string number to integer
      
      // VALIDATION: Turn commands (L/R) must be multiples of 90 between 0-360
      if ((action === 'L' || action === 'R') && (value % 90 !== 0 || value < 0 || value > 360)) {
        throw new Error(`Invalid turn angle: ${value}. Must be multiple of 90 between 0-360.`);
      }
      
      // Convert command codes to human-readable descriptions
      let description = "";
      switch (action) {
        case 'F': description = `Move Forward by ${value} metres.`; break;
        case 'B': description = `Move Backward by ${value} metres.`; break;
        case 'L': description = `Turn Left by ${value} degrees.`; break;  // Counterclockwise
        case 'R': description = `Turn Right by ${value} degrees.`; break; // Clockwise
      }
      
      // Add the parsed command to our results array
      commands.push({ action, value, description });
    }
    
    return commands;
  };

  // Handle user commands
  // This function is called when the user clicks "Parse Commands"
  const handleCommandSubmit = async () => {
    try {
      setCommandError(null); // Clear any previous errors
      
      // Convert input to uppercase to handle case-insensitive input (f10 -> F10)
      const commands = parseCommands(commandInput.toUpperCase());
      setParsedCommands(commands); // Store the parsed commands for display
    } catch (err) {
      // If parsing fails, show error and clear results
      setCommandError(err instanceof Error ? err.message : 'Invalid command format');
      setParsedCommands([]);
    }
  };

  if (loading) return <p>Loading forklifts...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Forklift Fleet</h1>
      <table border={1} cellPadding={10} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Model Number</th>
            <th>Manufacture Date</th>
          </tr>
        </thead>
        <tbody>
          {forklifts.map((f) => (
            <tr key={f.Id}>
              <td>{f.Id}</td>
              <td>{f.Name}</td>
              <td>{f.ModelNumber}</td>
              <td>{new Date(f.ManufacturingDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Command Input Section */}
      <h2 style={{ marginTop: "3rem" }}>Forklift Movement Commands</h2>
      <div style={{ marginBottom: "1rem" }}>
        {/* Text input for command string (e.g., "F10R90L90B5") */}
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Enter command (e.g., F10R90L90B5)"
          style={{ padding: "0.5rem", marginRight: "1rem", width: "300px" }}
        />
        {/* Button to trigger command parsing */}
        <button onClick={handleCommandSubmit} style={{ padding: "0.5rem 1rem" }}>
          Parse Commands
        </button>
      </div>
      
      {/* Display parsing errors if any */}
      {commandError && (
        <p style={{ color: "red" }}>Error: {commandError}</p>
      )}
      
      {/* Display parsed commands as numbered list */}
      {parsedCommands.length > 0 && (
        <div>
          <h3>Parsed Commands:</h3>
          <ol>
            {/* Map each parsed command to a list item with description */}
            {parsedCommands.map((cmd, index) => (
              <li key={`${cmd.action}-${cmd.value}-${index}`}>{cmd.description}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;