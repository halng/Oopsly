from app.seed_pouch import (
    band_for_focus,
    band_for_review,
    band_for_test,
    focus_gains,
    gains_for_test,
    review_gains,
    roll,
)


def test_focus_bands_follow_the_timer_buttons():
    assert band_for_focus(14) == "short"
    assert band_for_focus(15) == "steady"
    assert band_for_focus(24) == "steady"
    assert band_for_focus(25) == "strong"
    assert band_for_focus(44) == "strong"
    assert band_for_focus(45) == "deep"


def test_review_bands_step_up_when_most_grades_are_good_or_easy():
    assert band_for_review(4, good=0, easy=1) == "short"
    assert band_for_review(4, good=1, easy=2) == "steady"
    assert band_for_review(9, good=0, easy=0) == "steady"
    assert band_for_review(10, good=7, easy=0) == "deep"
    assert band_for_review(20, good=20, easy=0) == "deep"


def test_test_bands_follow_the_score():
    assert band_for_test(49) == "short"
    assert band_for_test(50) == "steady"
    assert band_for_test(69) == "steady"
    assert band_for_test(70) == "strong"
    assert band_for_test(89) == "strong"
    assert band_for_test(90) == "deep"
    assert band_for_test(100) == "deep"


def test_currency_gains_stay_smaller_than_a_long_focus_for_a_short_review():
    assert focus_gains(25) == {
        "dew_drops": 10,
        "sunlight_orbs": 5,
        "forest_coins": 8,
        "growth_points": 50,
    }
    assert review_gains(4) == {
        "dew_drops": 4,
        "sunlight_orbs": 0,
        "forest_coins": 2,
        "growth_points": 8,
    }
    assert review_gains(1)["forest_coins"] == 1
    assert review_gains(12)["dew_drops"] == 10
    assert gains_for_test(69)["sunlight_orbs"] == 2
    assert gains_for_test(70) == {
        "dew_drops": 10,
        "sunlight_orbs": 5,
        "forest_coins": 7,
        "growth_points": 14,
    }


def test_roll_splits_each_rarity_evenly():
    assert roll("short", 0.0) == ("wildflower_meadow", "Common")
    assert roll("short", 0.5) == ("citrus_grove", "Common")
    assert roll("short", 0.80) == ("cherry_blossom", "Rare")
    assert roll("short", 0.90) == ("kodama_mushrooms", "Rare")
    assert roll("short", 0.979) == ("spirit_lotus", "Rare")
    assert roll("short", 0.98) == ("sky_bonsai", "Mythic")
    assert roll("short", 0.99) == ("golden_ginkgo", "Mythic")
    assert roll("short", 1.0) == ("golden_ginkgo", "Mythic")
    assert roll("deep", 0.85) == ("camphor_tree", "Legendary")
    assert roll("steady", 0.995) == ("camphor_tree", "Legendary")
