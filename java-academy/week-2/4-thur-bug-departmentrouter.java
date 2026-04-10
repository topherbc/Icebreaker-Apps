public class DepartmentRouter {

    public static void main(String[] args) {

        String requestType = "payroll";
        String employeeName = "Derek Okonkwo";
        int employeeId = 4812;

        routeRequest(requestType);

        printConfirmation(employeeId, employeeName);
    }

    static void routeRequest(String requestType) {

        switch (requestType) {
            default:
                System.out.println("Request type not recognized. Please contact the front desk.");
            case "facilities":
                System.out.println("Routing to Facilities Management.");
                break;
            case "payroll":
                System.out.println("Routing to Payroll and Compensation.");
            case "benefits":
                System.out.println("Routing to Benefits Administration.");
                break;
            case "it":
                System.out.println("Routing to IT Support.");
                break;
        }
    }

    static void printConfirmation(String name, int id) {
        System.out.println("Confirmation sent to: " + name + " (ID #" + id + ")");
    }

    static void printConfirmation(int id, String name) {
        System.out.println("Request logged under ID #" + id + " for " + name);
    }
}