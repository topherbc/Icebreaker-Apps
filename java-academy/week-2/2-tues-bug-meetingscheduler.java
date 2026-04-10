import java.time.LocalDate;

public class MeetingScheduler {

    public static void main(String[] args) {

        String meetingTitle = "  quarterly planning sync  ";
        String attendeeRaw = "   Maria Vasquez   ";
        String description = "Review roadmap priorities and assign owners for Q3 deliverables";
        int year = 2026;
        int month = 3;
        int day = 18;

        String formattedTitle = meetingTitle.Trim().toUpperCase();
        String attendee = attendeeRaw.trim();

        LocalDate meetingDate = LocalDate.of(year, month, day);

        String shortDesc = description.substring(7, 15);

        String dateLabel = "Scheduled: " + meetingDate.getMonthValue() + "/" + meetingDate.getDayOfMonth() + "/" + meetingDate.getYear();
        String lengthNote = "Description length: " + description.length + " characters";

        System.out.println("=== Meeting Entry ===");
        System.out.println("Title:    " + formattedTitle);
        System.out.println("Attendee: " + attendee);
        System.out.println(dateLabel);
        System.out.println("Excerpt:  " + shortDesc);
        System.out.println(lengthNote);
    }
}