public class Switchboard {

    public static void main(String[] args) {

        System.out.println("=== OFFICE SWITCHBOARD ===");

        String requestType = "IT Support";

        System.out.println("Routing request: " + requestType);

        /* ___ */ (requestType) {
            case /* ___ */:
                System.out.println("Transferring to: Tech Department");
                /* ___ */;
            case "Billing":
                System.out.println("Transferring to: Finance Department");
                break;
            case "Facilities":
                System.out.println("Transferring to: Operations Department");
                break;
            /* ___ */:
                System.out.println("Transferring to: General Helpdesk");
        }

        greetEmployee("Marcus");
        /* ___ */;
    }

    public static /* ___ */ greetEmployee(String name) {
        System.out.println("Good morning, " + name + "!");
    }

    public static void greetEmployee(String name, /* ___ */ department) {
        System.out.println("Good morning, " + name + "! Welcome to the " + department + " department.");
    }

}