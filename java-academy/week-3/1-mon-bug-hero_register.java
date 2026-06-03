public class HeroRegistration {

    private String heroName;
    private String status;

    public HeroRegistration(String heroName, String status) {
        this.heroName = heroName;
        this.status = status;
    }

    public String getHeroName() {
        return heroName;
    }

    public String getStatus() {
        return status;
    }

    public static void main(String[] args) {
        HeroRegistration hero = new HeroRegistration("  Nova Strike  ", "active");

        String description = "HQ-7749 | Combat specialist. Cleared for field deployment.";

        String displayName = hero.getHeroName().trim().toUppercase();

        String codePrefix = description.substring(0, 6);

        System.out.println("=== HQ REGISTRATION COMPLETE ===");
        System.out.println("Hero Name   : " + displayName);
        System.out.println("Code Prefix : " + codePrefix);

        if (hero.getStatus() == "active") {
            System.out.println("Status      : CLEARED FOR DEPLOYMENT");
        } else {
            System.out.println("Status      : REGISTRATION PENDING REVIEW");
        }
    }
}