package config

import "testing"

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func TestDefaults(t *testing.T) {
	c := Load(env(nil))
	if c.Port != "9010" || c.AccessTTL.Milliseconds() != 86400000 || c.RefreshTTL.Milliseconds() != 604800000 {
		t.Fatalf("%+v", c)
	}
	if c.DBURL != "postgres://postgres:postgres@localhost:5432/oopsly" || c.RedisAddr != "localhost:6379" {
		t.Fatalf("%s %s", c.DBURL, c.RedisAddr)
	}
	if !c.NoOpMail() {
		t.Fatal("default SMTP credentials must disable mail")
	}
}

func TestOverrides(t *testing.T) {
	c := Load(env(map[string]string{
		"PORT": "1", "DB_PASSWORD": "p@ss:w/rd", "TEST_EMAILS": " a@b.co , c@d.co,", "JWT_EXPIRATION_MS": "1000",
		"SMTP_USERNAME": "u@x.io", "SMTP_PASSWORD": "pw",
	}))
	if c.Port != "1" || c.AccessTTL.Seconds() != 1 || len(c.TestEmails) != 2 || c.TestEmails[1] != "c@d.co" {
		t.Fatalf("%+v", c)
	}
	if c.DBURL != "postgres://postgres:p%40ss%3Aw%2Frd@localhost:5432/oopsly" {
		t.Fatal(c.DBURL)
	}
	if c.NoOpMail() {
		t.Fatal("real SMTP credentials should enable mail")
	}
	if !Load(env(map[string]string{"APP_ENV": "dev", "SMTP_USERNAME": "u@x.io", "SMTP_PASSWORD": "pw"})).NoOpMail() {
		t.Fatal("dev env must disable mail")
	}
}
