/**
 * Wraps user Python code with a startup script that parses inputs
 * and calls the main function.
 */


export function wrapCode(userCode: string, inputs: Record<string, any> = {}): string {
  // Escape the inputs to be safely embedded in Python string
  const inputsJson = JSON.stringify(inputs);
  //const apiUrl = context.apiUrl || "";
  
  // Python wrapper script
  const wrapperScript = `
import json
import sys
import traceback
import os


# --- User Code Start ---
${userCode}
# --- User Code End ---

if __name__ == "__main__":
    try:
        # Check if main function exists
        if 'main' not in globals():
            print("Error: 'main' function not defined in your code.", file=sys.stderr)
            sys.exit(1)
            
        # Parse inputs
        inputs_str = '${inputsJson.replace(/'/g, "\\'")}'
        try:
            inputs = json.loads(inputs_str)
        except json.JSONDecodeError:
            inputs = {}

        
        # Debug: Print inputs keys to stderr to verify injection
        # print(f"Debug: Calling main with inputs: {list(inputs.keys())}", file=sys.stderr)
            
        # Call main function with inputs
        # We support two signatures:
        # 1. main(args) - receives the dictionary
        # 2. main(**args) - receives unpacked arguments
        # 3. main() - receives no arguments if inputs is empty
        
        import inspect
        sig = inspect.signature(main)
        
        result = None
        
        if len(sig.parameters) == 0:
            result = main()
        elif len(sig.parameters) == 1 and list(sig.parameters.values())[0].kind == inspect.Parameter.VAR_KEYWORD:
             result = main(**inputs)
        else:
            # Try to call with inputs as a single argument if it matches the first param
            # Or unpack if the function expects specific arguments matching input keys
            try:
                result = main(**inputs)
            except TypeError:
                # Fallback: try passing the whole inputs dict as first argument
                result = main(inputs)

        # Print result if not None (optional, for debugging/logging)
        if result is not None:
            # Use json.dumps to ensure complex objects (like file dictionaries) are serializable and parsable
            try:
                print(json.dumps(result, default=str))
            except (TypeError, ValueError):
                # Fallback for non-serializable objects
                print(result)
            
    except Exception as e:
        traceback.print_exc()
        sys.exit(1)
`;

  return wrapperScript;
}