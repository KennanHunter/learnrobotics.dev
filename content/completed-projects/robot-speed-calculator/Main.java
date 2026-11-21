class Main {
    public static void main(String[] args) {
        double motor_rpm = 5000;
        double gear_ratio = 1 / 1;
        double diameter_in = 3.0;

        double motor_rpm_after_gear_ratio = motor_rpm * gear_ratio;
        double wheel_circumference_inch = Math.pow(Math.PI * (diameter_in / 2), 2);

        double wheel_inch_per_min = motor_rpm_after_gear_ratio * wheel_circumference_inch;

        System.out.println("Wheel speed is: " + wheel_circumference_inch + " in/min");

        double wheel_inch_per_second = wheel_inch_per_min / 60;

        System.out.println("Wheel speed is: " + wheel_inch_per_second + " in/sec");
    }
}
