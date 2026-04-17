/* ___ */ java.io.IOException;
/* ___ */ java.io.FileWriter;
/* ___ */ java.io.BufferedWriter;

public class IncidentReport {

    public static void main(String[] args) /* ___ */ IOException {

        System.out.println("=== Hero Dispatch -- Incident Report ===");
        System.out.println("Writing report to file...");

        FileWriter fileWriter = new FileWriter(/* ___ */);
        BufferedWriter writer = new /* ___ */;

        writer/* ___ */("INCIDENT REPORT -- Hero Dispatch Center");
        writer/* ___ */();
        writer/* ___ */("Villain: Doctor Nullius");
        writer/* ___ */();
        writer/* ___ */("Location: Downtown Sector 7");
        writer/* ___ */();
        writer/* ___ */("Threat Level: HIGH");
        writer/* ___ */();
        writer/* ___ */("Status: Heroes dispatched");
        writer/* ___ */();

        writer/* ___ */;

        System.out.println("Report filed successfully: incident_report.txt");
    }
}