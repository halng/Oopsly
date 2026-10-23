// Package mail sends OTP emails.
package mail

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
)

//go:embed email-otp.html
var otpTemplate string

const OTPSubject = "Oops! You got it! Here is your code"

type Sender interface {
	SendOTP(ctx context.Context, to, code string) error
}

// NoOp logs instead of sending; used for dev/test and unconfigured SMTP.
type NoOp struct{}

func (NoOp) SendOTP(_ context.Context, to, _ string) error {
	slog.Info("mail disabled; skipping OTP email", "to", Mask(to))
	return nil
}

type SMTP struct{ Host, Port, Username, Password string }

// RenderOTP fills the HTML template.
func RenderOTP(to, code string) string {
	user := strings.SplitN(to, "@", 2)[0]
	return strings.NewReplacer("{{OTP_CODE}}", code, "{{USER_NAME}}", user).Replace(otpTemplate)
}

func (s SMTP) SendOTP(_ context.Context, to, code string) error {
	if strings.ContainsAny(to, "\r\n") {
		return fmt.Errorf("invalid recipient")
	}
	msg := "From: " + s.Username + "\r\nTo: " + to + "\r\nSubject: " + OTPSubject +
		"\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" + RenderOTP(to, code)
	auth := smtp.PlainAuth("", s.Username, s.Password, s.Host)
	return smtp.SendMail(s.Host+":"+s.Port, auth, s.Username, []string{to}, []byte(msg))
}

// Mask hides most of the local part for logs.
func Mask(email string) string {
	at := strings.Index(email, "@")
	if at < 2 {
		return "***"
	}
	return email[:1] + "***" + email[at:]
}
