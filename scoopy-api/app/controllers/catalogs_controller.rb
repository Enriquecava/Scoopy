class CatalogsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!, except: :index

  def index
    render json: catalog.order(:name).as_json(only: [:id, :name])
  end

  def create
    record = catalog.create!(name: params.require(:name))
    render json: record.as_json(only: [:id, :name]), status: :created
  rescue ActiveRecord::RecordInvalid => e
    render_catalog_error(e.record)
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "duplicate_name" }, status: :conflict
  end

  def update
    record = catalog.find(params[:id])
    record.update!(name: params.require(:name))
    render json: record.as_json(only: [:id, :name])
  rescue ActiveRecord::RecordInvalid => e
    render_catalog_error(e.record)
  rescue ActiveRecord::RecordNotUnique
    render json: { error: "duplicate_name" }, status: :conflict
  end

  def destroy
    record = catalog.find(params[:id])
    if record.destroy
      head :no_content
    else
      render json: { error: "in_use", details: record.errors.full_messages }, status: :conflict
    end
  rescue ActiveRecord::InvalidForeignKey
    render json: { error: "in_use" }, status: :conflict
  end

  private

  def catalog
    { "brands" => Brand, "categories" => Category, "unit_measures" => UnitMeasure }.fetch(params[:catalog])
  end

  def render_catalog_error(record)
    if record.errors.of_kind?(:name, :taken)
      render json: { error: "duplicate_name" }, status: :conflict
    else
      render json: { errors: record.errors.full_messages }, status: :unprocessable_content
    end
  end
end
