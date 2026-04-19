import java.time.LocalDate;

public class MeetingNotes {

    public static void main(String[] args) {

        // The raw notes just came in -- messy whitespace included
        String rawNotes = "    Department: Engineering\n1. Budget Review | 2. Q3 Goals\nAction items: none today    ";

        // ---------------------------------------------------------------
        // Step 1: Get the character count BEFORE cleaning
        // ---------------------------------------------------------------
        int lengthBefore = rawNotes./* ___ */();

        // ---------------------------------------------------------------
        // Step 2: Remove the leading and trailing whitespace
        // ---------------------------------------------------------------
        String trimmedNotes = rawNotes./* ___ */();

        // ---------------------------------------------------------------
        // Step 3: Get the character count AFTER cleaning
        // ---------------------------------------------------------------
        int lengthAfter = trimmedNotes./* ___ */();

        // ---------------------------------------------------------------
        // Step 4: Convert the trimmed notes to all uppercase
        // ---------------------------------------------------------------
        String upperNotes = trimmedNotes./* ___ */();

        // ---------------------------------------------------------------
        // Step 5: Pull the department name out of the uppercase string.
        //         It starts at index 12 -- fill in that number below.
        // ---------------------------------------------------------------
        String department = upperNotes.substring(/* ___ */, 23);

        // ---------------------------------------------------------------
        // Step 6: Pull the first agenda item out of the trimmed string.
        //         "Budget Review" starts at index 27 and ends at 40.
        //         Fill in the method name below.
        // ---------------------------------------------------------------
        String firstItem = trimmedNotes./* ___ */(27, 40);

        // ---------------------------------------------------------------
        // Step 7: Split the trimmed notes into individual lines.
        //         Each line is separated by a newline character: "\n"
        // ---------------------------------------------------------------
        String[] lines = trimmedNotes./* ___ */("\n");

        // ---------------------------------------------------------------
        // Step 8: Capture today's date
        // ---------------------------------------------------------------
        LocalDate today = /* ___ */;

        // ---------------------------------------------------------------
        // Print the cleaned report
        // ---------------------------------------------------------------
        System.out.println("=== MEETING NOTES - CLEANED ===");
        System.out.println("Date: " + today);
        System.out.println("Length before trim: " + lengthBefore);
        System.out.println("Length after trim: " + lengthAfter);
        System.out.println("Department: " + department);
        System.out.println("First agenda item: " + firstItem);
        System.out.println("Lines in notes: " + lines.length);
    }
}