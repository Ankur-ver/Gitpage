import { useState, type ChangeEvent, type FormEvent, type CSSProperties } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const GITIGNORE_TEMPLATES = [
  "None",
  "Node",
  "Python",
  "Java",
  "Go",
  "React",
];

const LICENSE_TEMPLATES = [
  "None",
  "MIT",
  "Apache",
  "GPL",
];

const API_BASE_URL = "http://localhost:5000/api";

type RepositoryFormData = {
  name: string;
  description: string;
  visibility: "public" | "private";
  initializeWithReadme: boolean;
  gitignoreTemplate: string;
  licenseTemplate: string;
};

type FormErrors = Partial<Record<keyof Pick<RepositoryFormData, "name" | "description">, string>>;

// ─────────────────────────────────────────────────────────────────────────────
// CreateRepository Component
// ─────────────────────────────────────────────────────────────────────────────
const NewRepositoryPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RepositoryFormData>({
    name: "",
    description: "",
    visibility: "public",
    initializeWithReadme: false,
    gitignoreTemplate: "None",
    licenseTemplate: "None",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Validate form ────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Repository name is required";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.name)) {
      newErrors.name =
        "Only letters, numbers, dots, hyphens and underscores allowed";
    } else if (formData.name.length > 100) {
      newErrors.name = "Repository name cannot exceed 100 characters";
    }

    if (formData.description.length > 500) {
      newErrors.description = "Description cannot exceed 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Handle input change ──────────────────────────────────────────────────
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const name = target.name as keyof RepositoryFormData;
    const value =
      target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : target.value;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setServerError("");
  };

  // ── Handle form submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setServerError("");

    try {
      const token = localStorage.getItem("token");

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        visibility: formData.visibility,
        initializeWithReadme: formData.initializeWithReadme,
        gitignoreTemplate:
          formData.gitignoreTemplate === "None"
            ? ""
            : formData.gitignoreTemplate,
        licenseTemplate:
          formData.licenseTemplate === "None" ? "" : formData.licenseTemplate,
      };

      const response = await axios.post(
        `${API_BASE_URL}/repos`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Redirect to new repo page
        console.log("response:",response);
        navigate(response.data.data.htmlUrl);
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error ||
          "Failed to create repository. Please try again."
        : "Failed to create repository. Please try again.";
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Create a new repository</h1>
          <p style={styles.subtitle}>
            A repository contains all project files, including revision history.
          </p>
        </div>

        <hr style={styles.divider} />

        {/* Server Error */}
        {serverError && (
          <div style={styles.errorBanner}>
            <span>⚠️ {serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Repository Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Repository name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., my-awesome-project"
              style={{
                ...styles.input,
                ...(errors.name ? styles.inputError : {}),
              }}
              autoFocus
            />
            {errors.name && (
              <span style={styles.errorText}>{errors.name}</span>
            )}
            <span style={styles.hint}>
              Great repository names are short and memorable.
            </span>
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Description{" "}
              <span style={styles.optional}>(optional)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Short description of your repository"
              style={{
                ...styles.textarea,
                ...(errors.description ? styles.inputError : {}),
              }}
              rows={3}
            />
            {errors.description && (
              <span style={styles.errorText}>{errors.description}</span>
            )}
          </div>

          <hr style={styles.divider} />

          {/* Visibility */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Visibility</label>

            <div
              style={{
                ...styles.visibilityOption,
                ...(formData.visibility === "public"
                  ? styles.visibilitySelected
                  : {}),
              }}
              onClick={() =>
                setFormData((p) => ({ ...p, visibility: "public" }))
              }
            >
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={formData.visibility === "public"}
                onChange={handleChange}
                style={styles.radio}
              />
              <div>
                <div style={styles.visibilityLabel}>🌍 Public</div>
                <div style={styles.visibilityDesc}>
                  Anyone on the internet can see this repository.
                </div>
              </div>
            </div>

            <div
              style={{
                ...styles.visibilityOption,
                ...(formData.visibility === "private"
                  ? styles.visibilitySelected
                  : {}),
              }}
              onClick={() =>
                setFormData((p) => ({ ...p, visibility: "private" }))
              }
            >
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={formData.visibility === "private"}
                onChange={handleChange}
                style={styles.radio}
              />
              <div>
                <div style={styles.visibilityLabel}>🔒 Private</div>
                <div style={styles.visibilityDesc}>
                  Only you and collaborators can see this repository.
                </div>
              </div>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Initialize Options */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Initialize this repository with:</label>

            {/* README */}
            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="initializeWithReadme"
                name="initializeWithReadme"
                checked={formData.initializeWithReadme}
                onChange={handleChange}
                style={styles.checkbox}
              />
              <label
                htmlFor="initializeWithReadme"
                style={styles.checkboxLabel}
              >
                <strong>Add a README file</strong>
                <span style={styles.checkboxDesc}>
                  This is where you can write a long description for your
                  project.
                </span>
              </label>
            </div>

            {/* .gitignore */}
            <div style={styles.selectGroup}>
              <label style={styles.selectLabel}>
                Add .gitignore
              </label>
              <select
                name="gitignoreTemplate"
                value={formData.gitignoreTemplate}
                onChange={handleChange}
                style={styles.select}
              >
                {GITIGNORE_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* License */}
            <div style={styles.selectGroup}>
              <label style={styles.selectLabel}>
                Choose a license
              </label>
              <select
                name="licenseTemplate"
                value={formData.licenseTemplate}
                onChange={handleChange}
                style={styles.select}
              >
                {LICENSE_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Submit */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(isLoading ? styles.submitButtonDisabled : {}),
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>⏳ Creating repository...</span>
              ) : (
                <span>🚀 Create repository</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f6f8fa",
    display: "flex",
    justifyContent: "center",
    padding: "40px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #d0d7de",
    padding: "32px",
    width: "100%",
    maxWidth: "680px",
    height: "fit-content",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#24292f",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#57606a",
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: "1px solid #d0d7de",
    margin: "24px 0",
  },
  errorBanner: {
    backgroundColor: "#ffebe9",
    border: "1px solid #ff818266",
    borderRadius: "6px",
    padding: "12px 16px",
    marginBottom: "16px",
    color: "#cf222e",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  formGroup: {
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#24292f",
  },
  required: {
    color: "#cf222e",
    marginLeft: "4px",
  },
  optional: {
    color: "#57606a",
    fontWeight: "400",
    fontSize: "12px",
  },
  input: {
    padding: "8px 12px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#24292f",
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%",
    boxSizing: "border-box",
  },
  textarea: {
    padding: "8px 12px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#24292f",
    outline: "none",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputError: {
    borderColor: "#cf222e",
    backgroundColor: "#ffebe9",
  },
  errorText: {
    color: "#cf222e",
    fontSize: "12px",
  },
  hint: {
    color: "#57606a",
    fontSize: "12px",
  },
  visibilityOption: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 16px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    cursor: "pointer",
    marginBottom: "8px",
    transition: "border-color 0.2s, background-color 0.2s",
  },
  visibilitySelected: {
    borderColor: "#0969da",
    backgroundColor: "#ddf4ff",
  },
  visibilityLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#24292f",
  },
  visibilityDesc: {
    fontSize: "12px",
    color: "#57606a",
    marginTop: "2px",
  },
  radio: {
    marginTop: "2px",
    cursor: "pointer",
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 16px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    marginBottom: "12px",
  },
  checkbox: {
    marginTop: "3px",
    cursor: "pointer",
    width: "16px",
    height: "16px",
  },
  checkboxLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#24292f",
  },
  checkboxDesc: {
    fontSize: "12px",
    color: "#57606a",
    fontWeight: "400",
  },
  selectGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "12px",
  },
  selectLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#24292f",
  },
  select: {
    padding: "8px 12px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#24292f",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    width: "100%",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  cancelButton: {
    padding: "8px 20px",
    border: "1px solid #d0d7de",
    borderRadius: "6px",
    backgroundColor: "#f6f8fa",
    color: "#24292f",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  submitButton: {
    padding: "8px 20px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#1f883d",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitButtonDisabled: {
    backgroundColor: "#94d3a2",
    cursor: "not-allowed",
  },
};

export default NewRepositoryPage;