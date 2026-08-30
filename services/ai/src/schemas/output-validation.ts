import { ZodSchema } from "zod";

export class OutputValidator {
  public static extractAndValidate<T>(
    rawContent: string,
    schema: ZodSchema<T>,
  ): { success: boolean; data?: T; error?: string } {
    // 1. Try direct parse
    try {
      const parsed = JSON.parse(rawContent);
      const validated = schema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      return { success: false, error: validated.error.message };
    } catch {
      // 2. Try extracting from markdown code block ```json ... ```
      const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          const validated = schema.safeParse(parsed);
          if (validated.success) {
            return { success: true, data: validated.data };
          }
          return { success: false, error: validated.error.message };
        } catch (err: any) {
          return { success: false, error: `JSON parse error in code block: ${err.message}` };
        }
      }

      return {
        success: false,
        error: "Content does not contain valid JSON matching the required schema",
      };
    }
  }
}
