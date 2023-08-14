package edu.upenn.cis.nets2120.hw3;
public class HourlyAdsorption {
    public static void main(String[] args) {
        while (true) {
            AdsorptionAlgo algo = new AdsorptionAlgo();
            // this takes aproximately 10-15 minutes to run
            algo.run(15, 200000);
            try {
                Thread.sleep(60 *   // minutes to sleep
                        60 *   // seconds to a minute
                        1000); // milliseconds to a seconds
            } catch (Exception e) {
                System.out.println(e);
            }
            
        }
    }
}