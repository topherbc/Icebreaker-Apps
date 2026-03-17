class VoteTallier {

    /* ___ */ castVote(String name) {
        System.out.println("Vote cast against: " + name);
    }

    void /* ___ */(String name, String reason) {
        System.out.println("Vote cast against: " + name + " -- Reason: " + reason);
    }

    void /* ___ */(String name, /* ___ */ reason, /* ___ */ penalty) {
        System.out.println("Vote cast against: " + name + " -- Reason: " + reason);
        /* ___ */;
    }
}

public class TribalVote {

    public static void main(String[] args) {
        VoteTallier tallier = new VoteTallier();

        System.out.println("=== Tribal Council -- Vote Tally ===");
        tallier.castVote("Maya");
        tallier./* ___ */;
        tallier.castVote("Tyler", "hidden immunity", 3);
    }
}