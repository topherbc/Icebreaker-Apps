/* ___ */;
/* ___ */;

public class VillainRegistry {

    public static void main(String[] args) {

        /* ___ */ threats = new /* ___ */();

        threats/* ___ */("Doctor Nullius", "EXTREME");
        threats/* ___ */("Baron Vortex", "HIGH");
        threats/* ___ */("Shadow Wraith", "MODERATE");

        System.out.println("=== Villain Registry -- Hero HQ ===");
        System.out.println("Threat level for Doctor Nullius: " + threats/* ___ */("Doctor Nullius"));
        System.out.println("Is Baron Vortex in the registry? " + threats/* ___ */("Baron Vortex"));

        /* ___ */ activeVillains = new /* ___ */();

        activeVillains/* ___ */("Doctor Nullius");
        activeVillains/* ___ */("Baron Vortex");
        activeVillains/* ___ */("Shadow Wraith");

        System.out.println("Active Villain Roster:");
        /* ___ */ (String villain : activeVillains) {
            System.out.println(villain);
        }
    }
}