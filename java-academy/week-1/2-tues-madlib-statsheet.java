/**
 * Mad Lib #1 — The Recruit's Stat Sheet
 *
 * INSTRUCTIONS:
 *   Fill in each blank below by replacing /* ___ */ with the correct answer.
 *   Every blank is either a data type or a Java keyword you've already seen.
 *   When you're done, this file should compile and print the recruit's stat sheet.
 *
 * COMPILE:  javac StatSheet.java
 * RUN:      java StatSheet
 */
public class StatSheet {

    public static void main(String[] args) {

        // Blank 1: What data type holds a player's name (text)?
        /* ___ */ playerName = "Aldric";

        // Blank 2: What data type holds health points (a whole number)?
        /* ___ */ hp = 100;

        // Blank 3: What data type holds attack power (a decimal number)?
        /* ___ */ attackPower = 47.5;

        // Blank 4: What data type holds whether the player is alive (true/false)?
        /* ___ */ isAlive = true;

        // Blank 5: What keyword do we use to print a line to the console?
        /* ___ */("=== Guild Recruit Registration ===");
        /* ___ */("Name: "         + playerName);
        /* ___ */("HP: "           + hp);
        /* ___ */("Attack Power: " + attackPower);
        /* ___ */("Active: "       + isAlive);
    }
}