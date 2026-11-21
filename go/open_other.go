//go:build !windows

package main

import (
	"os/exec"
	"runtime"
)

// openBrowser opens the DM page in the default browser.
func openBrowser(url string) {
	if runtime.GOOS == "darwin" {
		exec.Command("open", url).Start()
		return
	}
	exec.Command("xdg-open", url).Start()
}
