/**
 * Category Service - Manages task categories and role-based presets
 */

export class CategoryService {
    constructor() {
        this.categories = new Map();
        this.initializeDefaultCategories();
    }

    // Initialize default categories for different roles
    initializeDefaultCategories() {
        const defaultCategories = [
            // Developer Categories
            {
                id: 'dev-frontend',
                name: 'Frontend Development',
                description: 'Client-side development tasks',
                role: 'developer',
                color: '#61dafb',
                icon: '🔧',
                isDefault: true,
                templates: ['UI Implementation', 'Component Development', 'Responsive Design']
            },
            {
                id: 'dev-backend',
                name: 'Backend Development',
                description: 'Server-side development tasks',
                role: 'developer',
                color: '#68217a',
                icon: '⚙️',
                isDefault: true,
                templates: ['API Development', 'Database Design', 'Server Configuration']
            },
            {
                id: 'dev-testing',
                name: 'Testing & QA',
                description: 'Testing and quality assurance tasks',
                role: 'developer',
                color: '#28a745',
                icon: '🧪',
                isDefault: true,
                templates: ['Unit Tests', 'Integration Tests', 'Bug Fixes']
            },
            {
                id: 'dev-devops',
                name: 'DevOps & Deployment',
                description: 'Deployment and infrastructure tasks',
                role: 'developer',
                color: '#ff6b35',
                icon: '🚀',
                isDefault: true,
                templates: ['CI/CD Setup', 'Server Deployment', 'Monitoring']
            },
            {
                id: 'dev-review',
                name: 'Code Review',
                description: 'Code review and documentation tasks',
                role: 'developer',
                color: '#6f42c1',
                icon: '👀',
                isDefault: true,
                templates: ['Pull Request Review', 'Code Documentation', 'Architecture Review']
            },

            // Student/Intern Categories
            {
                id: 'study-coursework',
                name: 'Coursework',
                description: 'Academic assignments and coursework',
                role: 'student',
                color: '#007bff',
                icon: '📚',
                isDefault: true,
                templates: ['Assignment Completion', 'Essay Writing', 'Problem Sets']
            },
            {
                id: 'study-research',
                name: 'Research',
                description: 'Research and investigation tasks',
                role: 'student',
                color: '#17a2b8',
                icon: '🔍',
                isDefault: true,
                templates: ['Literature Review', 'Data Collection', 'Analysis']
            },
            {
                id: 'study-projects',
                name: 'Projects',
                description: 'Academic and personal projects',
                role: 'student',
                color: '#e83e8c',
                icon: '🎯',
                isDefault: true,
                templates: ['Capstone Project', 'Group Project', 'Portfolio Development']
            },
            {
                id: 'study-learning',
                name: 'Skill Development',
                description: 'Learning new skills and technologies',
                role: 'student',
                color: '#fd7e14',
                icon: '🌱',
                isDefault: true,
                templates: ['Tutorial Completion', 'Certification Prep', 'Practice Exercises']
            },
            {
                id: 'study-internship',
                name: 'Internship Tasks',
                description: 'Work-related internship activities',
                role: 'student',
                color: '#20c997',
                icon: '🏢',
                isDefault: true,
                templates: ['Daily Tasks', 'Meeting Preparation', 'Progress Reports']
            },

            // Generic Categories
            {
                id: 'general-personal',
                name: 'Personal',
                description: 'Personal tasks and goals',
                role: 'generic',
                color: '#6c757d',
                icon: '👤',
                isDefault: true,
                templates: ['Personal Goal', 'Health & Fitness', 'Hobby Project']
            },
            {
                id: 'general-admin',
                name: 'Administrative',
                description: 'Administrative and organizational tasks',
                role: 'generic',
                color: '#ffc107',
                icon: '📋',
                isDefault: true,
                templates: ['Documentation', 'Meeting Schedule', 'Email Management']
            },
            {
                id: 'general-planning',
                name: 'Planning & Strategy',
                description: 'Planning and strategic tasks',
                role: 'generic',
                color: '#dc3545',
                icon: '📊',
                isDefault: true,
                templates: ['Goal Setting', 'Strategic Planning', 'Timeline Creation']
            }
        ];

        defaultCategories.forEach(category => {
            this.categories.set(category.id, category);
        });
    }

    // Get all categories
    getAllCategories() {
        return Array.from(this.categories.values());
    }

    // Get categories by role
    getCategoriesByRole(role) {
        return this.getAllCategories().filter(category => 
            category.role === role || category.role === 'generic'
        );
    }

    // Get category by ID
    getCategoryById(id) {
        return this.categories.get(id);
    }

    // Add custom category
    addCategory(categoryData) {
        const category = {
            id: categoryData.id || this.generateCategoryId(categoryData.name),
            name: categoryData.name,
            description: categoryData.description || '',
            role: categoryData.role || 'generic',
            color: categoryData.color || '#6c757d',
            icon: categoryData.icon || '📁',
            isDefault: false,
            templates: categoryData.templates || [],
            createdAt: new Date().toISOString(),
            createdBy: categoryData.createdBy || null
        };

        this.categories.set(category.id, category);
        return category;
    }

    // Update category
    updateCategory(id, updates) {
        const category = this.categories.get(id);
        if (category && !category.isDefault) {
            Object.assign(category, updates, {
                updatedAt: new Date().toISOString()
            });
            this.categories.set(id, category);
            return category;
        }
        return null;
    }

    // Delete category
    deleteCategory(id) {
        const category = this.categories.get(id);
        if (category && !category.isDefault) {
            this.categories.delete(id);
            return true;
        }
        return false;
    }

    // Generate category ID
    generateCategoryId(name) {
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return 'custom-' + slug + '-' + Date.now();
    }

    // Get category statistics
    getCategoryStats(tasks) {
        const stats = new Map();
        
        this.getAllCategories().forEach(category => {
            stats.set(category.id, {
                category: category,
                total: 0,
                completed: 0,
                inProgress: 0,
                todo: 0
            });
        });

        tasks.forEach(task => {
            const stat = stats.get(task.category);
            if (stat) {
                stat.total++;
                if (task.status === 'done') {
                    stat.completed++;
                } else if (task.status === 'in-progress') {
                    stat.inProgress++;
                } else if (task.status === 'todo') {
                    stat.todo++;
                }
            }
        });

        return Array.from(stats.values());
    }

    // Get role-based task templates
    getTaskTemplates(categoryId) {
        const category = this.getCategoryById(categoryId);
        return category ? category.templates : [];
    }

    // Create task from template
    createTaskFromTemplate(categoryId, templateName, additionalData = {}) {
        const category = this.getCategoryById(categoryId);
        if (!category || !category.templates.includes(templateName)) {
            return null;
        }

        return {
            title: templateName,
            description: `${templateName} task created from ${category.name} template`,
            category: categoryId,
            priority: 'medium',
            status: 'todo',
            tags: [category.role, category.name.toLowerCase()],
            ...additionalData
        };
    }

    // Get recommended categories based on task content
    getRecommendedCategories(taskTitle, taskDescription) {
        const content = (taskTitle + ' ' + taskDescription).toLowerCase();
        const recommendations = [];

        this.getAllCategories().forEach(category => {
            let score = 0;
            
            // Check category name and description
            if (content.includes(category.name.toLowerCase())) {
                score += 10;
            }
            
            // Check templates
            category.templates.forEach(template => {
                if (content.includes(template.toLowerCase())) {
                    score += 5;
                }
            });

            // Check role-specific keywords
            const roleKeywords = {
                developer: ['code', 'programming', 'development', 'api', 'frontend', 'backend', 'testing', 'deployment', 'bug', 'feature'],
                student: ['study', 'learn', 'assignment', 'project', 'research', 'coursework', 'internship', 'skill'],
                generic: ['personal', 'admin', 'meeting', 'planning', 'goal']
            };

            const keywords = roleKeywords[category.role] || [];
            keywords.forEach(keyword => {
                if (content.includes(keyword)) {
                    score += 2;
                }
            });

            if (score > 0) {
                recommendations.push({
                    category: category,
                    score: score,
                    confidence: Math.min(score / 10, 1)
                });
            }
        });

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    // Export categories for backup
    exportCategories() {
        return {
            categories: Array.from(this.categories.values()),
            exportedAt: new Date().toISOString()
        };
    }

    // Import categories from backup
    importCategories(categoryData) {
        if (categoryData.categories && Array.isArray(categoryData.categories)) {
            categoryData.categories.forEach(category => {
                if (!category.isDefault) {
                    this.categories.set(category.id, category);
                }
            });
            return true;
        }
        return false;
    }
}

// Create singleton instance
export const categoryService = new CategoryService();
