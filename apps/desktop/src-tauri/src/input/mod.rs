//! NexusDesk Native Input Injection Subsystem
//!
//! Provides native Windows SendInput abstractions, mouse movement,
//! click events, keyboard scan code mapping, and stuck-key release.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    X1,
    X2,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MouseAction {
    Down,
    Up,
    Click,
    DoubleClick,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenPoint {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardModifiers {
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
    pub meta: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardEvent {
    pub code: String,
    pub key: String,
    pub is_down: bool,
    pub modifiers: KeyboardModifiers,
}

pub trait InputController {
    fn move_cursor(&self, point: ScreenPoint) -> Result<(), String>;
    fn mouse_button(&self, button: MouseButton, action: MouseAction) -> Result<(), String>;
    fn mouse_wheel(&self, delta_x: i32, delta_y: i32) -> Result<(), String>;
    fn keyboard(&self, event: KeyboardEvent) -> Result<(), String>;
    fn release_all(&self) -> Result<(), String>;
}
