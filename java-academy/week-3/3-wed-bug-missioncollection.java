import java.util.HashMap;
import java.util.ArrayList;

public class MissionCollections {

    public static void main(String[] args) {

        HashMap villainRegistry = new HashMap();

        villainRegistry.put("Doctor Nullius", "EXTREME");
        villainRegistry.put("Baron Vortex", "HIGH");

        ArrayList<String> missionRoster = new ArrayList<>();

        missionRoster.add("Doctor Nullius");
        missionRoster.add("Baron Vortex");
        missionRoster.add("Shadow Wraith");

        System.out.println("=== Villain Registry ===");

        if (villainRegistry.containsKey("Doctor Nullius")) {
            System.out.println("Doctor Nullius -- Threat Level: " + villainRegistry.get("doctor nullius"));
        }

        if (villainRegistry.containsKey("Baron Vortex")) {
            System.out.println("Baron Vortex -- Threat Level: " + villainRegistry.get("Baron Vortex"));
        }

        System.out.println();
        System.out.println("=== Active Mission Roster ===");

        for (String villain : missionRoster) {
            System.out.println(villain);
        }

        System.out.println();
        System.out.println("First mission target: " + missionRoster.get(3));
    }
}