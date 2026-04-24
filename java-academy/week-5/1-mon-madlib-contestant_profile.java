class Contestant {

    /* ___ */ String name;         // blank 1
    /* ___ */ String hometown;     // blank 1
    /* ___ */ int votesReceived;   // blank 1

    Contestant(String name, String hometown, int votesReceived) {
        /* ___ */.name = name;             // blank 3
        /* ___ */.hometown = hometown;     // blank 3
        /* ___ */.votesReceived = votesReceived; // blank 3
    }

    /* ___ */ getName() {          // blank 2
        return name;
    }

    /* ___ */ getHometown() {      // blank 2
        return hometown;
    }

    /* ___ */ getFullIntroduction() {  // blank 2
        /* ___ */;                     // blank 4
    }

    /* ___ */ isAtRisk() {         // blank 5
        /* ___ */;                 // blank 6
    }
}

class ContestantProfile {

    public static void main(String[] args) {
        Contestant c = /* ___ */ Contestant("Maya", "Austin", 5);  // blank 7

        System.out.println("=== Island Challenge -- Contestant Profile ===");
        System.out.println("Name: " + c.getName());
        System.out.println("Hometown: " + c.getHometown());
        System.out.println("Full Introduction: " + c.getFullIntroduction());
        System.out.println("Votes Received: " + c.votesReceived);
        System.out.println("At Risk: " + c.isAtRisk());
    }
}