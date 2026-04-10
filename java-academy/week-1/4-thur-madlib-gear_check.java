import java.util.Scanner;

public class GearCheck {

    public static void main(String[] args) {

        /* ___ */ scanner = new Scanner(System.in);

        System.out.println("=== Gear Cache Check ===");

        System.out.print("Enter your name, climber: ");
        String climberName = scanner./* ___ */();

        System.out.print("Enter your starting altitude: ");
        int climberAlt = scanner./* ___ */();

        /* ___ */

        /* ___ */ gear = new String[]{"Crampon Set", "Ice Axe", "Headlamp"};


        String selectedGear = gear[/* ___ */];

        System.out.println("Checking gear: " + selectedGear);

        if (selectedGear./* ___ */("Ice Axe")) {
            System.out.println(climberName + " (" + climberAlt + " m) -- " + selectedGear + " is available. Cleared for ascent.");
        }
        /* ___ */ {
            System.out.println(climberName + " (" + climberAlt + " m) -- " + selectedGear + " is not available. Climber is grounded.");
        }

        scanner.close();
    }
}
