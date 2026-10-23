package mail

import (
	"bufio"
	"context"
	"net"
	"strings"
	"testing"
)

func TestMask(t *testing.T) {
	tests := map[string]string{
		"ann@example.com": "a***@example.com",
		"a@example.com":   "***",
		"nope":            "***",
		"":                "***",
	}
	for in, want := range tests {
		if got := Mask(in); got != want {
			t.Errorf("Mask(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestRenderOTP(t *testing.T) {
	out := RenderOTP("ann@example.com", "123456")
	if !strings.Contains(out, "123456") || !strings.Contains(out, "ann") {
		t.Fatal("code and user name should be rendered")
	}
	if strings.Contains(out, "{{OTP_CODE}}") || strings.Contains(out, "{{USER_NAME}}") {
		t.Fatal("placeholders left in template")
	}
}

func TestNoOp(t *testing.T) {
	if err := (NoOp{}).SendOTP(context.Background(), "ann@example.com", "123456"); err != nil {
		t.Fatal(err)
	}
}

// fakeSMTP accepts one message on 127.0.0.1 (PlainAuth is allowed over loopback) and returns what it received.
func fakeSMTP(t *testing.T) (port string, got chan string) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = ln.Close() })
	got = make(chan string, 1)
	go func() {
		c, err := ln.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		r := bufio.NewReader(c)
		send := func(s string) { _, _ = c.Write([]byte(s + "\r\n")) }
		send("220 fake ESMTP")
		var data strings.Builder
		inData := false
		for {
			line, err := r.ReadString('\n')
			if err != nil {
				return
			}
			line = strings.TrimRight(line, "\r\n")
			switch {
			case inData && line == ".":
				inData = false
				got <- data.String()
				send("250 queued")
			case inData:
				data.WriteString(line + "\n")
			case strings.HasPrefix(line, "EHLO"), strings.HasPrefix(line, "HELO"):
				send("250-fake")
				send("250 AUTH PLAIN")
			case strings.HasPrefix(line, "AUTH"):
				send("235 ok")
			case strings.HasPrefix(line, "DATA"):
				inData = true
				send("354 go ahead")
			case strings.HasPrefix(line, "QUIT"):
				send("221 bye")
				return
			default: // MAIL FROM, RCPT TO, RSET
				send("250 ok")
			}
		}
	}()
	_, port, _ = net.SplitHostPort(ln.Addr().String())
	return port, got
}

func TestSMTPSendOTP(t *testing.T) {
	port, got := fakeSMTP(t)
	s := SMTP{Host: "127.0.0.1", Port: port, Username: "noreply@oopsly.dev", Password: "pw"}
	if err := s.SendOTP(context.Background(), "ann@example.com", "654321"); err != nil {
		t.Fatal(err)
	}
	msg := <-got
	for _, want := range []string{"To: ann@example.com", "Subject: " + OTPSubject, "654321"} {
		if !strings.Contains(msg, want) {
			t.Errorf("message missing %q:\n%s", want, msg)
		}
	}
}

func TestSMTPSendOTPErrors(t *testing.T) {
	s := SMTP{Host: "127.0.0.1", Port: "1", Username: "u", Password: "p"}
	if err := s.SendOTP(context.Background(), "a@b.co\r\nBcc: x@y.z", "1"); err == nil {
		t.Fatal("header injection in recipient must be rejected")
	}
	if err := s.SendOTP(context.Background(), "a@b.co", "1"); err == nil {
		t.Fatal("unreachable server must return an error")
	}
}
