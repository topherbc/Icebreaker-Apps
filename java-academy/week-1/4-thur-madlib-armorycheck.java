/**
 * Mad Lib #2 — The Armory Check
 *
 * Fill in each blank marked with /* ___ */ to make this program compile and run correctly.
 *
 * There are 9 blanks total. Read the surrounding code carefully.
 *
 * When solved, your console output should look exactly like this:
 *
 *   === Armory Weapons Check ===
 *   Enter your name, recruit: Gareth
 *   Enter your starting HP: 80
 *   Checking weapon: Iron Sword
 *   Gareth (80 HP) — Iron Sword is available. Cleared for training.
 *
 * NOTE on Blank 8: In Java, you cant compare Strings with ==.
 * Instead, use the .equals() method: someString.equals("value")
 *
 * NOTE on Blank 4: After reading a number with nextInt(), the Enter key you pressed
 * is still sitting in the buffer. If you try to read a String next, it will grab that
 * leftover Enter instead of waiting for you to type. A bare nextLine() call throws it away.
 * 
 */

import java.util.Scanner;

public class ArmoryCheck {

    public static void main(String[] args) {

        // Blank 1: What class do we use to read input from the keyboard?
        /* ___ */ scanner = new Scanner(System.in);

        System.out.println("=== Armory Weapons Check ===");

        // Blank 2: What method reads a full line of text input?
        System.out.print("Enter your name, recruit: ");
        String recruitName = scanner./* ___ */();

        // Blank 3: What method reads a whole number?
        System.out.print("Enter your starting HP: ");
        int recruitHP = scanner./* ___ */();

        // Blank 4: The Enter key from nextInt() is still in the buffer.
        // One line below clears it. What is that line?
        /* ___ */

        // Blank 5: What is the data type for an array of Strings?
        /* ___ */ weapons = new String[]{"Battle Axe", "Iron Sword", "Crossbow"};

        // Blank 6: What keyword initializes a new array object?
        // (already filled above — look closely, is it correct?)

        // Blank 7: We want "Iron Sword" — what index is that?
        String selectedWeapon = weapons[/* ___ */];

        System.out.println("Checking weapon: " + selectedWeapon);

        // Blank 8: Fill in the comparison method — check if selectedWeapon equals "Iron Sword"
        if (selectedWeapon./* ___ */("Iron Sword")) {
            System.out.println(recruitName + " (" + recruitHP + " HP) — "
                + selectedWeapon + " is available. Cleared for training.");
        }
        // Blank 9: What keyword introduces the alternative branch?
        /* ___ */ {
            System.out.println(recruitName + " (" + recruitHP + " HP) — "
                + selectedWeapon + " is not available. Recruit is denied.");
        }

        scanner.close();
    }
}